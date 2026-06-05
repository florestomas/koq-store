DROP FUNCTION IF EXISTS confirmar_traslado(p_id uuid, p_id_origin uuid, p_id_destination uuid, p_id_user_origin uuid, p_items jsonb);
DROP FUNCTION IF EXISTS confirmar_traslado(p_id uuid, p_id_origin text, p_id_destination text, p_id_user_origin uuid, p_items jsonb);

CREATE OR REPLACE FUNCTION confirmar_traslado(
  p_id uuid,
  p_id_origin text,
  p_id_destination text,
  p_id_user_origin text,
  p_items jsonb
) RETURNS void AS $$
DECLARE
  item record;
  v_stock integer;
BEGIN
  FOR item IN
    SELECT * FROM jsonb_to_recordset(p_items)
      AS x(id_product text, quantity integer, unit_price numeric)
  LOOP
    SELECT current_stock INTO v_stock
    FROM stock_locations
    WHERE id_product = item.id_product AND id_location = p_id_origin
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto % sin stock registrado en origen', item.id_product;
    END IF;

    IF v_stock < item.quantity THEN
      RAISE EXCEPTION 'Stock insuficiente para producto % (disponible: %, solicitado: %)',
        item.id_product, v_stock, item.quantity;
    END IF;
  END LOOP;

  INSERT INTO transfers (id, date_time, id_origin, id_destination, id_user_origin, status)
  VALUES (p_id, NOW(), p_id_origin, p_id_destination, p_id_user_origin, 'pending');

  FOR item IN
    SELECT * FROM jsonb_to_recordset(p_items)
      AS x(id_product text, quantity integer, unit_price numeric)
  LOOP
    UPDATE stock_locations
    SET current_stock = current_stock - item.quantity
    WHERE id_product = item.id_product AND id_location = p_id_origin;

    INSERT INTO transfer_details (id, id_transfer, id_product, quantity, unit_price)
    VALUES (gen_random_uuid(), p_id, item.id_product, item.quantity, item.unit_price);
  END LOOP;
END;
$$ LANGUAGE plpgsql;
