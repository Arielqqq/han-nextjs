import { Box, Button, Container, Flex, FormControl, FormLabel, Grid, GridItem, Heading, Input, Stack, Text, useTheme } from '@chakra-ui/react';
import { useContentfulInspectorMode } from '@contentful/live-preview/react';

import { CtfImage } from '@src/components/features/contentful/ctf-image';
import { FormatCurrency } from '@src/components/shared/format-currency';
import { QuantitySelector } from '@src/components/shared/quantity-selector';
import { PageProductFieldsFragment } from '@src/lib/__generated/sdk';

import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

import CheckoutForm from "./CheckoutForm";

import emailjs from 'emailjs-com';
import dayjs from 'dayjs';

import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react'

// Make sure to call loadStripe outside of a component's render to avoid
// recreating the Stripe object on every render.
// This is your test publishable API key.
const stripePromise = loadStripe("pk_test_51O4hxbGdMUVbjnpKM8jVq1dCyaEZAJnxdZM5kwuIxrRBqdYHr4a4EfDsfLDxdTzWRVjtoduJW4bJNE3rvdWqvOvL00nAgQYk3X");

export const ProductDetails = ({
  name,
  price,
  description,
  featuredProductImage,
  productImagesCollection,
  sys: { id: entryId },
}: PageProductFieldsFragment) => {
  const theme = useTheme();
  const inspectorProps = useContentfulInspectorMode({ entryId });

  const [flag, setFlag] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [customerName, setcustomerName] = useState('')
  const [customerEmail, setcustomerEmail] = useState('')
  const [customerPhoneNumber, setCustomerPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [clientSecret, setClientSecret] = useState("");

  const handleEndDateChange = (date) => {
    setEndDate(date)
    console.log(`startDate: ${startDate}, endDate: ${date}`)

    let day = differenceInCalendarDays(
      date,
      startDate
    );
    console.log(`Total rental days: ${day}`)
    const rate = 100;
    let price = day * rate;
    setTotalPrice(price)
  }

  emailjs.init("tNyKur-R-RE3MNLK6");
  const submitHandler = (e) => {
    setIsSubmitting(true);

    emailjs.send("service_bcw3hh9", "template_aihrkpk", {
      customerName: customerName,
      price: totalPrice.toString(),
      customerEmail: customerEmail,
      startDate: dayjs(startDate).format('DD/MM/YYYY'),
      endDate: dayjs(endDate).format('DD/MM/YYYY'),
    },
    )
      .then((response) => {
        setIsSubmitting(false);
        setIsEmailSent(true);
        console.log("Email sent successfully:", response);
      })
      .catch((error) => {
        setIsSubmitting(false);
        console.error("Email could not be sent:", error);
      });
  }

  const appearance = {
    theme: 'stripe',
  };
  const options: any = {
    clientSecret,
    appearance,
  };


  useEffect(() => {
    if(totalPrice == 0) {
      return
    }
    // Create PaymentIntent as soon as the page loads
    fetch("http://localhost:4242/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: "xl-tshirt" }], amount: totalPrice*100 }),
    })
      .then((res) => res.json())
      .then((data) => setClientSecret(data.clientSecret));
  }, [totalPrice]);

  return (
    <Container mt={{ base: 6, lg: 16 }}>
      <Grid templateColumns="repeat(12, 1fr)" gap={{ base: 5, lg: 12 }}>
        <GridItem colSpan={{ base: 12, lg: 7, xl: 8 }}>
          <Flex flexDirection="column" gap={{ base: 3, lg: 5 }}>
            {featuredProductImage && (
              <CtfImage
                livePreviewProps={inspectorProps({ fieldId: 'featuredProductImage' })}
                {...featuredProductImage}
              />
            )}
            {productImagesCollection?.items &&
              productImagesCollection.items.map(image => {
                return image ? (
                  <CtfImage
                    livePreviewProps={inspectorProps({ fieldId: 'productImages' })}
                    key={image.sys.id}
                    imageProps={{
                      sizes: '(max-width: 1200px) 70vw, 100vw',
                    }}
                    {...image}
                  />
                ) : null;
              })}
          </Flex>
        </GridItem>

        <GridItem colSpan={{ base: 12, lg: 5, xl: 4 }}>
          <Box
            width="100%"
            bg={theme.f36.gray100}
            mb="auto"
            borderRadius={4}
            px={{ base: 4, lg: 6 }}
            pt={{ base: 6, lg: 6 }}
            pb={{ base: 8, lg: 14 }}>
            <Heading {...inspectorProps({ fieldId: 'name' })} as="h1" variant="h3">
              {name}
            </Heading>
            {price && (
              <Text {...inspectorProps({ fieldId: 'price' })} mt={1} fontWeight="500">
                <FormatCurrency value={price} />
              </Text>
            )}
            <Text {...inspectorProps({ fieldId: 'description' })} mt={5} color={theme.f36.gray700}>
              {description}
            </Text>

            <Box mt={{ base: 5, lg: 10 }}>
              <QuantitySelector />
              <div className={'product-detail__dateRange'}>
                <label>from: </label>
                <DatePicker selected={startDate} onChange={(date) => setStartDate(date)} />
              </div>
              <div className={'product-detail__dateRange'}>
                <label>to: </label>
                <DatePicker selected={endDate} onChange={(date) => handleEndDateChange(date)} />
              </div>

              <label className={'product-price'}><b>Total Price:</b> ${totalPrice}</label>
              <div>
                <Button variant="primary" onClick={() => setFlag(!flag)}>
                  Confirm
                </Button>
              </div>

              {flag &&
                <div className={'customer-info-container'}>
                  <FormControl isRequired>
                    <FormLabel>Name</FormLabel>
                    <Input value={customerName} onChange={(e) => { setcustomerName(e.target.value) }} placeholder='Name' />
                  </FormControl>
                  <FormControl marginTop={'5px'} isRequired>
                    <FormLabel>Email</FormLabel>
                    <Input value={customerEmail} onChange={(e) => { setcustomerEmail(e.target.value) }} placeholder='Email' />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Phone Number</FormLabel>
                    <Input value={customerPhoneNumber} onChange={(e) => { setCustomerPhoneNumber(e.target.value) }} placeholder='Number' />
                  </FormControl>
                  {isEmailSent && (
                    <Stack spacing={3}>
                      <Alert status='success'>
                        <AlertIcon />
                        Your order has been sent.
                      </Alert>
                    </Stack>
                  )}
                  <Button
                    mt={4}
                    colorScheme='teal'
                    type='submit'
                    onClick={submitHandler}
                    disabled={isSubmitting}
                  >
                    Submit
                  </Button>
                  {clientSecret && (
                    <Elements options={options} stripe={stripePromise}>
                      <CheckoutForm />
                    </Elements>
                  )}
                </div>}
            </Box>
          </Box>
        </GridItem>
      </Grid>
    </Container>
  );

};